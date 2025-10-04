import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DataPreviewProps {
  data: any;
}

export const DataPreview: React.FC<DataPreviewProps> = ({ data }) => {
  if (!data || !data.rows || data.rows.length === 0) {
    return null;
  }

  const previewRows = data.rows.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Aperçu des données</CardTitle>
            <CardDescription>
              {data.metadata.rowCount} lignes × {data.metadata.columnCount} colonnes
              {data.rows.length > 10 && ` (affichage des 10 premières lignes)`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">{data.metadata.fileType}</Badge>
            <Badge variant="outline">{data.metadata.fileName}</Badge>
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
                  {data.headers.map((header: string, idx: number) => (
                    <TableHead key={idx} className="font-semibold">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row: any, rowIdx: number) => (
                  <TableRow key={rowIdx}>
                    <TableCell className="font-medium text-muted-foreground">
                      {rowIdx + 1}
                    </TableCell>
                    {data.headers.map((header: string, cellIdx: number) => (
                      <TableCell key={cellIdx} className="max-w-xs truncate">
                        {row[header] || '-'}
                      </TableCell>
                    ))}
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
