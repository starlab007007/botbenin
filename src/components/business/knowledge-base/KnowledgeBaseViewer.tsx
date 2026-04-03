import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface KnowledgeBaseViewerProps {
  knowledgeBaseId: string;
  onBack: () => void;
}

export const KnowledgeBaseViewer: React.FC<KnowledgeBaseViewerProps> = ({ knowledgeBaseId, onBack }) => {
  const { knowledgeBases, updateKnowledgeBase, exportKnowledgeBase } = useKnowledgeBases();
  const { getTemplateById, calculateCompletion } = useKnowledgeBaseTemplates();
  const isMobile = useIsMobile();
  
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-3 text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const template = getTemplateById(kb.template_id);
  if (!template) return null;

  const isGoogleSheetMode = template.googleSheetConfig && (template.id === 'ecommerce' || template.id === 'restaurant');
  const handleSave = async () => {
    const completion = calculateCompletion(editedData, editedStructuralInfo, template);
    const success = await updateKnowledgeBase(kb.id, {
      data: editedData,
      structural_info: editedStructuralInfo,
      completion_percentage: completion
    });
    if (success) setHasChanges(false);
  };

  const handleTableDataChange = (tableId: string, newData: Record<string, any>[]) => {
    setEditedData({ ...editedData, [tableId]: newData });
    setHasChanges(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="outline" size={isMobile ? 'sm' : 'default'} onClick={onBack} className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
              {!isMobile && <span className="ml-1.5">Retour</span>}
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-bold truncate">{kb.name}</h1>
                <Badge className="shrink-0 text-[10px] sm:text-xs">{template.name}</Badge>
              </div>
              {!isMobile && <p className="text-xs text-muted-foreground mt-0.5 truncate">{kb.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={isMobile ? 'sm' : 'default'}>
                  <Download className="w-4 h-4" />
                  {!isMobile && <span className="ml-1.5">Exporter</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportKnowledgeBase(kb, 'json')}><FileJson className="w-4 h-4 mr-2" />JSON</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportKnowledgeBase(kb, 'excel')}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportKnowledgeBase(kb, 'csv')}><FileText className="w-4 h-4 mr-2" />CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportKnowledgeBase(kb, 'pdf')}><FileText className="w-4 h-4 mr-2" />PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleSave} disabled={!hasChanges} size={isMobile ? 'sm' : 'default'}>
              <Save className="w-4 h-4" />
              {!isMobile && <span className="ml-1.5">{hasChanges ? 'Enregistrer' : 'Enregistré'}</span>}
            </Button>
          </div>
        </div>

        {/* Progress */}
        <Card className="border-0 bg-gradient-to-r from-primary/5 to-transparent shadow-sm">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
              <span className="text-muted-foreground">Complétion de la base</span>
              <span className="font-bold text-primary">{kb.completion_percentage}%</span>
            </div>
            <Progress value={kb.completion_percentage} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="structural" className="space-y-4">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className={`${isMobile ? 'flex w-max gap-1' : 'grid w-full'}`} style={!isMobile ? { gridTemplateColumns: `repeat(${template.tables.length + 1}, minmax(0, 1fr))` } : undefined}>
            <TabsTrigger value="structural" className="text-xs sm:text-sm whitespace-nowrap px-3">
              Infos Essentielles
            </TabsTrigger>
            {template.tables.map(table => (
              <TabsTrigger key={table.id} value={table.id} className="text-xs sm:text-sm whitespace-nowrap px-3">
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
              setEditedStructuralInfo({ ...editedStructuralInfo, [fieldName]: value });
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

      {template.googleSheetConfig && template.id === 'ecommerce' && (
        <EcommerceSheetViewer knowledgeBaseId={kb.id} />
      )}
      {template.googleSheetConfig && template.id === 'restaurant' && (
        <RestaurationSheetViewer knowledgeBaseId={kb.id} />
      )}
    </div>
  );
};
