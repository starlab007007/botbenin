import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pencil, Save, X, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditableDataPreviewProps {
  data: any;
  onDataChange?: (updatedData: any) => void;
}

export const EditableDataPreview: React.FC<EditableDataPreviewProps> = ({ data, onDataChange }) => {
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [localData, setLocalData] = useState(data);

  const handleStartEdit = useCallback((rowIdx: number, colName: string, currentValue: string) => {
    setEditingCell({ row: rowIdx, col: colName });
    setEditValue(currentValue || '');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingCell) return;
    
    const updatedRows = [...localData.rows];
    updatedRows[editingCell.row] = {
      ...updatedRows[editingCell.row],
      [editingCell.col]: editValue
    };
    
    const updatedData = {
      ...localData,
      rows: updatedRows
    };
    
    setLocalData(updatedData);
    onDataChange?.(updatedData);
    setEditingCell(null);
    
    toast({
      title: "Cellule modifiée",
      description: "Les modifications ont été enregistrées.",
    });
  }, [editingCell, editValue, localData, onDataChange, toast]);

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  const handleDeleteRow = useCallback((rowIdx: number) => {
    const updatedRows = localData.rows.filter((_: any, idx: number) => idx !== rowIdx);
    const updatedData = {
      ...localData,
      rows: updatedRows,
      metadata: {
        ...localData.metadata,
        rowCount: updatedRows.length
      }
    };
    
    setLocalData(updatedData);
    onDataChange?.(updatedData);
    
    toast({
      title: "Ligne supprimée",
      description: "La ligne a été supprimée avec succès.",
    });
  }, [localData, onDataChange, toast]);

  if (!localData || !localData.rows || localData.rows.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Aperçu et édition des données</CardTitle>
            <CardDescription>
              {localData.metadata.rowCount} lignes × {localData.metadata.columnCount} colonnes
              <span className="ml-2 text-primary">• Cliquez sur une cellule pour l'éditer</span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">{localData.metadata.fileType}</Badge>
            <Badge variant="outline">{localData.metadata.fileName}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full rounded-md border">
          <div className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {localData.headers.map((header: string, idx: number) => (
                    <TableHead key={idx} className="font-semibold">
                      {header}
                    </TableHead>
                  ))}
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localData.rows.map((row: any, rowIdx: number) => (
                  <TableRow key={rowIdx}>
                    <TableCell className="font-medium text-muted-foreground">
                      {rowIdx + 1}
                    </TableCell>
                    {localData.headers.map((header: string, cellIdx: number) => (
                      <TableCell key={cellIdx} className="max-w-xs">
                        {editingCell?.row === rowIdx && editingCell?.col === header ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              className="h-8"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveEdit}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 group"
                            onClick={() => handleStartEdit(rowIdx, header, row[header])}
                          >
                            <span className="truncate flex-1">{row[header] || '-'}</span>
                            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteRow(rowIdx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
