import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { ArrowLeft, CheckCircle2, Save, Bot, Sparkles } from 'lucide-react';
import { SectorTemplateSelector } from './SectorTemplateSelector';
import { StructuralInfoForm } from './StructuralInfoForm';
import { DataTableEditor } from './DataTableEditor';
import { useKnowledgeBaseTemplates } from '@/hooks/useKnowledgeBaseTemplates';
import { useKnowledgeBases } from '@/hooks/useKnowledgeBases';
import { KnowledgeBaseTemplate } from '@/types/knowledge-base';
import { useToast } from '@/hooks/use-toast';

interface KnowledgeBaseCreatorProps {
  onBack: () => void;
}

type CreationStep = 'select' | 'edit' | 'preview';

export const KnowledgeBaseCreator: React.FC<KnowledgeBaseCreatorProps> = ({ onBack }) => {
  const [step, setStep] = useState<CreationStep>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<KnowledgeBaseTemplate | null>(null);
  const [knowledgeBaseName, setKnowledgeBaseName] = useState('');
  const [structuralInfo, setStructuralInfo] = useState<Record<string, string>>({});
  const [tablesData, setTablesData] = useState<Record<string, Record<string, any>[]>>({});
  const [saving, setSaving] = useState(false);

  const { templates, calculateCompletion } = useKnowledgeBaseTemplates();
  const { createKnowledgeBase } = useKnowledgeBases();
  const { toast } = useToast();

  const handleSelectTemplate = (template: KnowledgeBaseTemplate) => {
    setSelectedTemplate(template);
    setKnowledgeBaseName(`Ma base ${template.name}`);
    setStep('edit');
  };

  const handleStructuralInfoChange = (fieldName: string, value: string) => {
    setStructuralInfo(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleTableDataChange = (tableId: string, data: Record<string, any>[]) => {
    setTablesData(prev => ({ ...prev, [tableId]: data }));
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const completion = calculateCompletion(tablesData, structuralInfo, selectedTemplate);
      
      const result = await createKnowledgeBase({
        name: knowledgeBaseName,
        sector: selectedTemplate.sector,
        template_id: selectedTemplate.id,
        description: selectedTemplate.description,
        data: tablesData,
        structural_info: structuralInfo,
        completion_percentage: completion,
        is_active: true
      });

      if (result) {
        toast({
          title: 'Succès !',
          description: 'Votre base de connaissances a été créée avec succès'
        });
        onBack();
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const getCompletionPercentage = () => {
    if (!selectedTemplate) return 0;
    return calculateCompletion(tablesData, structuralInfo, selectedTemplate);
  };

  const getTotalEntries = () => {
    return Object.values(tablesData).reduce((sum, table) => sum + table.length, 0);
  };

  const getFilledTables = () => {
    return Object.keys(tablesData).filter(key => tablesData[key].length > 0).length;
  };

  if (step === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-3 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <Button variant="outline" onClick={onBack} className="shrink-0">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Créer une Base de Connaissances</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Entraînez votre bot IA avec vos données métier
              </p>
            </div>
          </div>

          <SectorTemplateSelector
            templates={templates}
            onSelectTemplate={handleSelectTemplate}
          />
        </div>
      </div>
    );
  }

  if (step === 'edit' && selectedTemplate) {
    const completion = getCompletionPercentage();

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-3 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <Button variant="outline" onClick={() => setStep('select')} className="shrink-0">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Changer de template</span>
              <span className="sm:hidden">Retour</span>
            </Button>
            <Badge variant="outline" className="text-sm sm:text-lg py-1.5 sm:py-2 px-3 sm:px-4 whitespace-nowrap">
              Complétion : {completion}%
            </Badge>
          </div>

          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="kb-name">Nom de votre base de connaissances *</Label>
                <Input
                  id="kb-name"
                  value={knowledgeBaseName}
                  onChange={(e) => setKnowledgeBaseName(e.target.value)}
                  placeholder="Ex: Restaurant Le Petit Bistrot"
                  className="text-lg font-semibold mt-2"
                />
              </div>
              <Progress value={completion} className="h-2" />
            </div>
          </Card>

          <StructuralInfoForm
            fields={selectedTemplate.structuralInfo}
            values={structuralInfo}
            onChange={handleStructuralInfoChange}
          />

          <Accordion type="multiple" defaultValue={[selectedTemplate.tables[0]?.id || '']} className="space-y-4">
            {selectedTemplate.tables.map((table) => (
              <AccordionItem key={table.id} value={table.id} className="border rounded-lg">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <span className="font-semibold">{table.name}</span>
                    <Badge variant="outline">
                      {tablesData[table.id]?.length || 0} entrée{tablesData[table.id]?.length > 1 ? 's' : ''}
                    </Badge>
                    {table.required && <Badge>Requis</Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <DataTableEditor
                    table={table}
                    data={tablesData[table.id] || []}
                    onChange={(data) => handleTableDataChange(table.id, data)}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <Card className="p-4 sm:p-6 border-2 bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary mt-1 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-base sm:text-lg mb-2">
                    {completion >= 70 ? 'Votre base est prête !' : 'Complétez votre base'}
                  </h3>
                  {completion >= 70 ? (
                    <p className="text-sm sm:text-base text-muted-foreground mb-4">
                      Vous avez renseigné suffisamment d'informations pour créer un bot intelligent. 
                      Le bot pourra répondre aux questions sur vos services, produits et informations pratiques.
                    </p>
                  ) : (
                    <p className="text-sm sm:text-base text-muted-foreground mb-4">
                      Complétez au moins 70% des informations pour créer une base de connaissances efficace pour votre bot IA.
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-primary">{getFilledTables()}</div>
                      <div className="text-muted-foreground mt-1">Tables remplies</div>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-primary">{getTotalEntries()}</div>
                      <div className="text-muted-foreground mt-1">Entrées totales</div>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-primary">{completion}%</div>
                      <div className="text-muted-foreground mt-1">Complétion</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  size="lg" 
                  className="flex-1 text-sm sm:text-base"
                  onClick={handleSave}
                  disabled={!knowledgeBaseName || saving || completion < 10}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Enregistrement...' : 'Enregistrer la base'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return null;
};
