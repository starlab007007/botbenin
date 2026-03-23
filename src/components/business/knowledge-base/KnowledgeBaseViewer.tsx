import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { EcommerceSheetViewer } from './EcommerceSheetViewer';
import { RestaurationSheetViewer } from './RestaurationSheetViewer';
import { KnowledgeBase } from '@/types/knowledge-base';
import { useKnowledgeBases } from '@/hooks/useKnowledgeBases';
import { useKnowledgeBaseTemplates } from '@/hooks/useKnowledgeBaseTemplates';
import { StructuralInfoForm } from './StructuralInfoForm';
import { DataTableEditor } from './DataTableEditor';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface KnowledgeBaseViewerProps {
  knowledgeBaseId: string;
  onBack: () => void;
}

export const KnowledgeBaseViewer: React.FC<KnowledgeBaseViewerProps> = ({ 
  knowledgeBaseId, 
  onBack 
}) => {
  const { knowledgeBases, updateKnowledgeBase, exportKnowledgeBase } = useKnowledgeBases();
  const { getTemplateById, calculateCompletion } = useKnowledgeBaseTemplates();
  
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [editedData, setEditedData] = useState<Record<string, any[]>>({});
  const [editedStructuralInfo, setEditedStructuralInfo] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const found = knowledgeBases.find(k => k.id === knowledgeBaseId);
    if (found) {
      setKb(found);
      setEditedData(found.data);
      setEditedStructuralInfo(found.structural_info);
    }
  }, [knowledgeBaseId, knowledgeBases]);

  if (!kb) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  const template = getTemplateById(kb.template_id);
  if (!template) return null;

  const handleSave = async () => {
    const completion = calculateCompletion(editedData, editedStructuralInfo, template);
    
    const success = await updateKnowledgeBase(kb.id, {
      data: editedData,
      structural_info: editedStructuralInfo,
      completion_percentage: completion
    });

    if (success) {
      setHasChanges(false);
    }
  };

  const handleTableDataChange = (tableId: string, newData: Record<string, any>[]) => {
    setEditedData({ ...editedData, [tableId]: newData });
    setHasChanges(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
            <Button variant="outline" onClick={onBack} className="shrink-0">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div className="w-full sm:w-auto">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold break-words">{kb.name}</h1>
                <Badge className="shrink-0">{template.name}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{kb.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-initial">
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Exporter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportKnowledgeBase(kb, 'json')}>
                  <FileJson className="w-4 h-4 mr-2" />
                  Format JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportKnowledgeBase(kb, 'excel')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Format Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportKnowledgeBase(kb, 'csv')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Format CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportKnowledgeBase(kb, 'pdf')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Format PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex-1 sm:flex-initial"
            >
              <Save className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{hasChanges ? 'Enregistrer' : 'Enregistré'}</span>
              <span className="sm:hidden">{hasChanges ? 'Sauver' : 'OK'}</span>
            </Button>
          </div>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Complétion de la base</span>
                <span className="font-medium">{kb.completion_percentage}%</span>
              </div>
              <Progress value={kb.completion_percentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="structural" className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full min-w-max" style={{ gridTemplateColumns: `repeat(${template.tables.length + 1}, minmax(0, 1fr))` }}>
              <TabsTrigger value="structural" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">
                Informations Essentielles
              </TabsTrigger>
              {template.tables.map(table => (
                <TabsTrigger key={table.id} value={table.id} className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4">
                  {table.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="structural" className="space-y-4">
            <StructuralInfoForm
              fields={template.structuralInfo}
              values={editedStructuralInfo}
              onChange={(fieldName, value) => {
                const updated = { ...editedStructuralInfo, [fieldName]: value };
                setEditedStructuralInfo(updated);
                setHasChanges(true);
              }}
            />
          </TabsContent>

          {template.tables.map(table => (
            <TabsContent key={table.id} value={table.id}>
              <DataTableEditor
                table={table}
                data={editedData[table.id] || []}
                onChange={(newData) => handleTableDataChange(table.id, newData)}
              />
            </TabsContent>
          ))}
        </Tabs>

        {/* Google Sheets sync for e-commerce */}
        {template.googleSheetConfig && (
          <EcommerceSheetViewer knowledgeBaseId={kb.id} />
        )}
      </div>
    </div>
  );
};
