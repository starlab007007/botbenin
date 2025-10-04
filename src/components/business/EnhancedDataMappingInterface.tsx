import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Wand2, CheckCircle2, FileText } from 'lucide-react';
import { useDataMapper } from '@/hooks/useDataMapper';
import { useToast } from '@/hooks/use-toast';

interface EnhancedDataMappingInterfaceProps {
  sourceData: any;
  onMappingComplete: (mappedData: any, template: string) => void;
}

export const EnhancedDataMappingInterface: React.FC<EnhancedDataMappingInterfaceProps> = ({
  sourceData,
  onMappingComplete
}) => {
  const { toast } = useToast();
  const { templates, analyzeAndSuggestTemplate, autoMapFields, mapToTemplate, validateMapping } = useDataMapper();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (sourceData?.headers) {
      const suggested = analyzeAndSuggestTemplate(sourceData.headers);
      setSelectedTemplate(suggested);
      const autoMapping = autoMapFields(sourceData.headers, suggested);
      setFieldMapping(autoMapping);
    }
  }, [sourceData, analyzeAndSuggestTemplate, autoMapFields]);

  const handleAutoMap = () => {
    if (selectedTemplate) {
      const autoMapping = autoMapFields(sourceData.headers, selectedTemplate);
      setFieldMapping(autoMapping);
    }
  };

  const handleFieldMappingChange = (templateField: string, sourceField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [templateField]: sourceField
    }));
  };

  const handleComplete = () => {
    const finalMapping = mapToTemplate(sourceData, selectedTemplate, fieldMapping);
    
    if (!finalMapping) {
      return;
    }

    const validation = validateMapping(finalMapping, selectedTemplate);
    
    // Afficher les avertissements mais permettre de continuer
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      toast({
        title: "⚠️ Avertissements détectés",
        description: "Certains champs requis sont manquants. Vous pouvez continuer ou corriger.",
        variant: "default"
      });
      // Ne pas return, permettre de continuer
    } else {
      toast({
        title: "✓ Mapping validé",
        description: "Données prêtes pour l'import"
      });
    }

    onMappingComplete({ rows: finalMapping }, selectedTemplate);
  };

  if (!sourceData) return null;

  return (
    <div className="space-y-6">
      {/* Template Selection - Prominent */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Sélectionnez le type de données</CardTitle>
              <CardDescription>
                Choisissez le type de données que vous importez pour un mapping optimal
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedTemplate?.id}
            onValueChange={(value) => {
              const template = templates.find(t => t.id === value);
              setSelectedTemplate(template);
              if (template) {
                const autoMapping = autoMapFields(sourceData.headers, template);
                setFieldMapping(autoMapping);
              }
            }}
          >
            <SelectTrigger className="w-full h-12">
              <SelectValue placeholder="Choisir un type de données..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-3 py-1">
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                    <span className="font-medium">{template.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Description:</p>
              <p className="text-sm">{selectedTemplate.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTemplate.fields.slice(0, 5).map((field: any) => (
                  <Badge key={field.name} variant="secondary" className="text-xs">
                    {field.name}
                  </Badge>
                ))}
                {selectedTemplate.fields.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedTemplate.fields.length - 5} autres
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Mapping */}
      {selectedTemplate && (
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Configuration du mapping</CardTitle>
                <CardDescription>
                  Associez les colonnes de votre fichier aux champs du template
                </CardDescription>
              </div>
              <Button onClick={handleAutoMap} variant="outline" size="sm">
                <Wand2 className="w-4 h-4 mr-2" />
                Mapping automatique
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTemplate.fields.map((field: any) => (
              <div key={field.name} className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{field.name}</span>
                    {field.required && (
                      <Badge variant="destructive" className="text-xs">Requis</Badge>
                    )}
                  </div>
                  {field.description && (
                    <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                  )}
                </div>
                
                <ArrowRight className="w-4 h-4 text-muted-foreground hidden md:block" />
                
                <div className="flex-1 w-full">
                  <Select
                    value={fieldMapping[field.name] || '_unmapped'}
                    onValueChange={(value) => handleFieldMappingChange(field.name, value === '_unmapped' ? '' : value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_unmapped">Non mappé</SelectItem>
                      {sourceData.headers.map((header: string) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {fieldMapping[field.name] && fieldMapping[field.name] !== '_unmapped' && (
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Validation Warnings */}
      {validationErrors.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
              </div>
              <h4 className="font-medium text-sm text-yellow-700 dark:text-yellow-500">
                Avertissements de validation ({validationErrors.length})
              </h4>
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-500/80 mb-3">
              Ces champs requis sont manquants. Vous pouvez continuer ou les corriger.
            </p>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx} className="text-sm text-yellow-700 dark:text-yellow-500">{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Complete Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-sm text-muted-foreground text-center md:text-left">
          {Object.keys(fieldMapping).filter(k => fieldMapping[k]).length} champs mappés sur {selectedTemplate?.fields?.length || 0}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleAutoMap} variant="outline" size="sm" className="w-full sm:w-auto">
            <Wand2 className="w-4 h-4 mr-2" />
            Auto-mapper
          </Button>
          <Button onClick={handleComplete} size="lg" className="w-full sm:w-auto sm:min-w-[200px]">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            <span className="truncate">{validationErrors.length > 0 ? 'Continuer malgré tout' : 'Valider et continuer'}</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};
